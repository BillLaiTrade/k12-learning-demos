export function mediumSelector(group,onSelect){
 group.addEventListener('click',event=>{
  const button=event.target.closest('button[data-lab-medium]');
  if(button&&group.contains(button))onSelect(button.dataset.labMedium);
 });
 return {
  render(key){
   group.dataset.current=key;
   group.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.labMedium===key)));
   group.setAttribute('aria-label',`切換介質，目前為${key==='water'?'水':'玻璃'}`);
  },
  focus(){group.querySelector('[aria-pressed=true]').focus({preventScroll:true});}
 };
}
