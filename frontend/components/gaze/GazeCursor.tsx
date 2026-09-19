'use client';
import type {GazeCursor as Point} from '../../lib/gaze/useGaze';
export function GazeCursor({point}:{point:Point}){return point.visible?<div className='gaze-cursor' aria-hidden='true' style={{left:`${point.x*100}%`,top:`${point.y*100}%`}}><span/></div>:null;}
