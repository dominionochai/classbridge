import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FacePoint } from './blinkDetector';
import type { Point } from './emaSmooth';
export type GazeEstimate={raw:Point;landmarks:FacePoint[];timestamp:number};
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm',MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const mean=(p:FacePoint[])=>p.reduce((a,q)=>({x:a.x+q.x,y:a.y+q.y}),{x:0,y:0});
function ratio(iris:FacePoint,o:FacePoint,i:FacePoint,u:FacePoint,l:FacePoint){const w=Math.max(.001,Math.abs(i.x-o.x)),h=Math.max(.001,Math.abs(l.y-u.y));return{x:(iris.x-Math.min(o.x,i.x))/w,y:(iris.y-Math.min(u.y,l.y))/h};}
export class GazeEstimator{
  private constructor(private readonly task:FaceLandmarker){}
  static async create(){const files=await FilesetResolver.forVisionTasks(WASM);const task=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.55,minFacePresenceConfidence:.55,minTrackingConfidence:.55});return new GazeEstimator(task);}
  estimate(video:HTMLVideoElement,time=performance.now()):GazeEstimate|null{const result=this.task.detectForVideo(video,time),p=result.faceLandmarks?.[0] as FacePoint[]|undefined;if(!p||p.length<478)return null;const a=ratio(mean(p.slice(468,473)),p[33],p[133],p[159],p[145]),b=ratio(mean(p.slice(473,478)),p[362],p[263],p[386],p[374]);return{raw:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},landmarks:p,timestamp:time};}
  close(){this.task.close();}
}
