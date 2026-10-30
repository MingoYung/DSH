import '../runtime/scene/brand.js';
import '../runtime/scene/animation.js';
import '../runtime/scene/morph.js';
import '../runtime/scene/desktop-composition.js';
import '../runtime/scene/responsive-composition.js';
import '../runtime/scene/portrait-camera.js';
import '../runtime/safe-video.js';
import '../runtime/stage.js';
import '../runtime/bootstrap.js';
import * as panel from './client.jsx';

export const name='dsh-awakening';
export const inject=['slots','configForms'];
export function apply(ctx){
  const bridge=window.__DSH_AWAKENING_INSTALL__({...window.__DSH_AWAKENING_OPTIONS__,autostart:false});
  const form=ctx.configForms.get('dsh-awakening');
  const update=()=>{const snapshot=form.getSnapshot();if(snapshot.status==='ready'&&snapshot.value)bridge.configure(snapshot.value);};
  update();ctx.effect(()=>form.subscribe(update));ctx.effect(()=>()=>bridge.dispose());
  panel.apply(ctx);
}
export default {name,inject,apply};
