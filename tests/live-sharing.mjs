// Explicit integration smoke test against the configured live Firebase project.
// Run only when intentionally testing live services; this creates a test event.
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, doc, collection, setDoc, getDoc, onSnapshot, serverTimestamp, deleteDoc, terminate } from 'firebase/firestore';
import assert from 'node:assert/strict';
import { eventData } from '../src/lib/sharedEvents.js';
const config={projectId:'meetwithme-20260930',apiKey:'AIzaSyBu8biM9PZZRL9gLLOSZSwGkDlkU9ek5O0',appId:'1:107602535107:web:52a81b23df9596ac22f876'};
const apps=[initializeApp(config,'smoke-a'),initializeApp(config,'smoke-b')];
const users=[];
const [a,b]=apps.map(app=>getFirestore(app));
const ref=doc(collection(a,'events'));
try {
 for (const app of apps) users.push((await signInAnonymously(getAuth(app))).user);
 const e=eventData({name:'Sharing verification',mode:'dates',dates:['2026-10-20'],start:36,end:40,zone:'America/Chicago'},users[0].uid);
 await setDoc(ref,{...e,createdAt:serverTimestamp()});
 console.log('Test event ID:',ref.id);
 assert.equal((await getDoc(doc(b,'events',ref.id))).data().name,e.name);
 const received=new Promise((resolve,reject)=>{let stop;const timer=setTimeout(()=>{stop();reject(Error('Live update timeout'));},20000);stop=onSnapshot(collection(b,'events',ref.id,'responses'),s=>{if(s.docs.some(d=>d.id===users[0].uid)){clearTimeout(timer);stop();resolve();}},err=>{clearTimeout(timer);reject(err);});});
 await setDoc(doc(a,'events',ref.id,'responses',users[0].uid),{name:'Test A',slots:['2026-10-20:36'],updatedAt:serverTimestamp()});
 await received;
 await setDoc(doc(b,'events',ref.id,'responses',users[1].uid),{name:'Test B',slots:['2026-10-20:36'],updatedAt:serverTimestamp()});
 await assert.rejects(setDoc(doc(b,'events',ref.id,'responses',users[0].uid),{name:'Overwrite',slots:[],updatedAt:serverTimestamp()}),err=>err.code==='permission-denied');
 assert.equal((await getDoc(doc(a,'events',ref.id,'responses',users[1].uid))).data().name,'Test B');
 console.log('PASS: anonymous sessions, shared reads, live cross-user updates, isolated writes.');
} finally {
 for(let i=0;i<users.length;i++) {await deleteDoc(doc([a,b][i],'events',ref.id,'responses',users[i].uid));await deleteUser(users[i]);}
 for(let i=0;i<apps.length;i++){await terminate([a,b][i]);await deleteApp(apps[i]);}
}
