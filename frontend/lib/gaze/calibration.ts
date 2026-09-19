import type { Point } from './emaSmooth';
export type CalibrationSample={target:Point;gaze:Point};
export type CalibrationModel={x:[number,number,number];y:[number,number,number];sampleCount:number;error:number};
export const CALIBRATION_POINTS:Point[]=[{x:.12,y:.14},{x:.88,y:.14},{x:.5,y:.5},{x:.12,y:.86},{x:.88,y:.86}];
function solve(m:number[][],v:number[]){const a=m.map((r,i)=>[...r,v[i]]);for(let c=0;c<3;c++){let p=c;for(let r=c+1;r<3;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-8)return null;[a[c],a[p]]=[a[p],a[c]];const q=a[c][c];for(let i=c;i<4;i++)a[c][i]/=q;for(let r=0;r<3;r++)if(r!==c){const f=a[r][c];for(let i=c;i<4;i++)a[r][i]-=f*a[c][i];}}return[a[0][3],a[1][3],a[2][3]] as [number,number,number];}
function fit(s:CalibrationSample[],axis:'x'|'y'){const m=Array.from({length:3},()=>[0,0,0]),v=[0,0,0];for(const q of s){const f=[1,q.gaze.x,q.gaze.y],z=q.target[axis];for(let r=0;r<3;r++){v[r]+=f[r]*z;for(let c=0;c<3;c++)m[r][c]+=f[r]*f[c];}}return solve(m,v)??([0,axis==='x'?1:0,axis==='y'?1:0] as [number,number,number]);}
const predict=(c:[number,number,number],p:Point)=>c[0]+c[1]*p.x+c[2]*p.y;
export function fitCalibration(s:CalibrationSample[]):CalibrationModel{if(s.length<5)throw new Error('At least five calibration samples are required');const x=fit(s,'x'),y=fit(s,'y');const error=s.reduce((n,q)=>n+Math.hypot(predict(x,q.gaze)-q.target.x,predict(y,q.gaze)-q.target.y),0)/s.length;return{x,y,sampleCount:s.length,error};}
export function applyCalibration(m:CalibrationModel,p:Point):Point{return{x:Math.max(0,Math.min(1,predict(m.x,p))),y:Math.max(0,Math.min(1,predict(m.y,p)))}}
