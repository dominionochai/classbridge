export type FacePoint = { x: number; y: number; z?: number };
export type BlinkState = { leftEar: number; rightEar: number; ear: number; isClosed: boolean; blinked: boolean };
const L = [33,133,159,145] as const, R = [362,263,386,374] as const;
const d = (a: FacePoint,b: FacePoint) => Math.hypot(a.x-b.x,a.y-b.y);
function ear(p: FacePoint[], ids: readonly [number,number,number,number]) { const [o,i,u,l]=ids; if (!p[o]||!p[i]||!p[u]||!p[l]) return 1; return d(p[u],p[l])/Math.max(.001,d(p[o],p[i])); }
export class BlinkDetector {
  private closed = 0; private open = 0;
  constructor(private readonly closeAt=.205, private readonly openAt=.235) {}
  reset(){this.closed=0;this.open=0;}
  update(p: FacePoint[]): BlinkState { const leftEar=ear(p,L),rightEar=ear(p,R),value=(leftEar+rightEar)/2; if(value<this.closeAt){this.closed++;this.open=0;} else if(value>this.openAt)this.open++; const blinked=this.open===1&&this.closed>=2; if(blinked)this.closed=0; if(this.open>4)this.open=0; return {leftEar,rightEar,ear:value,isClosed:value<this.closeAt,blinked}; }
}
