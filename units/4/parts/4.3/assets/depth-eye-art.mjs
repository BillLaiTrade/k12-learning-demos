// Shared vector artwork: the draggable eye and the view's heading use one iris.
export const EYE_LINK_ANCHOR = Object.freeze({ x: 40, y: 21 });
export function eyeArtwork() {
  const filaments = Array.from({length:88},(_,i)=>{
    const angle=i*Math.PI*2/88, inner=5.9+(i%7)*.21, outer=12.1+(i%5)*.18;
    const p=(r,a)=>`${(r*Math.cos(a)).toFixed(3)} ${(r*Math.sin(a)).toFixed(3)}`;
    return `<path d="M${p(inner,angle)}Q${p(9.4,angle+.035*Math.sin(i*2.7))} ${p(outer,angle+.012)}" stroke="${['#c4bf7d','#5f743f','#d4cc90','#435b39','#a2ad70'][i%5]}" stroke-width="${i%3===0?.42:.24}" opacity=".68"/>`;
  }).join('');
  return `<radialGradient id="depth-eye-sclera" cx=".42" cy=".62" r=".75"><stop stop-color="#fffef5"/><stop offset=".6" stop-color="#f1efdb"/><stop offset="1" stop-color="#aaa998"/></radialGradient>
  <radialGradient id="depth-eye-iris" cx=".4" cy=".38"><stop stop-color="#a19a55"/><stop offset=".45" stop-color="#b1ad70"/><stop offset=".73" stop-color="#6c824c"/><stop offset="1" stop-color="#354c36"/></radialGradient>
  <radialGradient id="depth-eye-pupil"><stop stop-color="#0b1510"/><stop offset=".8" stop-color="#13231b"/><stop offset="1" stop-color="#263624"/></radialGradient>
  <linearGradient id="depth-eye-lid" x2="0" y2="1"><stop stop-color="#665f46"/><stop offset=".65" stop-color="#999376"/><stop offset="1" stop-color="#d5c9a7"/></linearGradient>
  <linearGradient id="depth-eye-bezel" x2=".3" y2="1"><stop stop-color="#fff9de"/><stop offset=".28" stop-color="#e5ce95"/><stop offset=".62" stop-color="#b79856"/><stop offset="1" stop-color="#f4e4b5"/></linearGradient>
  <linearGradient id="depth-eye-pad" x2=".25" y2="1"><stop stop-color="#fffcf0"/><stop offset=".6" stop-color="#f5edd4"/><stop offset="1" stop-color="#e5d6ad"/></linearGradient>
  <linearGradient id="depth-rail-metal" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="75" y2="82"><stop stop-color="#fff7d8"/><stop offset=".42" stop-color="#e2d7b4"/><stop offset=".65" stop-color="#9a9d86"/><stop offset="1" stop-color="#d5d3b6"/></linearGradient>
  <clipPath id="depth-eye-opening"><path d="M-35 0C-17-24 16-25 35 0C17 22-17 21-35 0Z"/></clipPath>
  <filter id="depth-eye-soft-shadow" x="-30%" y="-55%" width="160%" height="230%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#473d25" flood-opacity=".25"/></filter>
  <g id="depth-eye-art">
    <path d="M-36 1C-18-26 17-26 36 1C17 25-18 24-36 1Z" fill="#c5bc9c" opacity=".5" transform="translate(0 1.2)"/>
    <g clip-path="url(#depth-eye-opening)">
      <rect x="-36" y="-23" width="72" height="46" fill="url(#depth-eye-sclera)"/>
      <circle r="13.7" fill="#435641"/><circle r="13.1" fill="url(#depth-eye-iris)"/>
      ${filaments}
      <circle r="8.1" fill="none" stroke="#b5b16c" stroke-width=".7" opacity=".45"/>
      <circle r="5.8" fill="url(#depth-eye-pupil)"/>
      <path d="M-36-1C-16-27 15-27 36-1" fill="none" stroke="#3e3e2b" stroke-width="7" opacity=".16"/>
      <ellipse cx="-3.8" cy="-5.4" rx="3.7" ry="2.2" transform="rotate(-25)" fill="#fffef4" opacity=".87"/>
      <circle cx="4.4" cy="3.3" r="1.1" fill="#fffef0" opacity=".62"/>
      <path d="M-11 7Q0 14 11 7" fill="none" stroke="#fffde9" stroke-width=".7" opacity=".25"/>
    </g>
    <path d="M-35 0C-17-24 16-25 35 0" fill="none" stroke="url(#depth-eye-lid)" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M-35 0C-17 21 17 22 35 0" fill="none" stroke="#8e8e72" stroke-width=".85"/>
    <path d="M-30-5C-15-23 14-24 29-6" fill="none" stroke="#f5eaca" stroke-width=".65" opacity=".75"/>
    <path d="M-34 1L-30 2M30 2L34 1" stroke="#c6b18c" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;
}
