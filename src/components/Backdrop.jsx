const ITEMS = [
  { t: 'flower', x: '6%',  y: '12%', s: 58, dx: 34, dy: 26,  r: 80,  d: 20, delay: 0 },
  { t: 'flower', x: '88%', y: '58%', s: 44, dx: -28, dy: -34, r: -70, d: 24, delay: -8 },
  { t: 'flower', x: '12%', y: '76%', s: 36, dx: 24, dy: -30, r: 100, d: 22, delay: -4 },
  { t: 'flower', x: '82%', y: '8%',  s: 32, dx: -20, dy: 30,  r: -90, d: 26, delay: -12 },
  { t: 'star', c: 'y', x: '24%', y: '7%',  s: 24, dx: 18, dy: 22,  r: 60,  d: 17, delay: -3 },
  { t: 'star', c: 'r', x: '93%', y: '34%', s: 20, dx: -16, dy: 26, r: -50, d: 21, delay: -9 },
  { t: 'star', c: 'y', x: '4%',  y: '46%', s: 18, dx: 20, dy: -22, r: 70,  d: 19, delay: -6 },
]

function Flower() {
  return (
    <svg viewBox="0 0 100 100">
      <g fill="#c9726a">
        <circle cx="50" cy="28" r="22" />
        <circle cx="72" cy="50" r="23" />
        <circle cx="50" cy="72" r="22" />
        <circle cx="28" cy="50" r="23" />
      </g>
      <circle cx="50" cy="50" r="12" fill="#e5c982" />
    </svg>
  )
}

function Star({ color }) {
  return (
    <svg viewBox="0 0 100 100">
      <path
        d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4Z"
        fill={color === 'y' ? '#e8d083' : '#cf6a5f'}
      />
    </svg>
  )
}

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bd-glow a" />
      <div className="bd-glow b" />
      <div className="bd-glow c" />
      <div className="bd-glow d" />
      <div className="bd-pattern" />
      <div className="bd-grain" />

      {ITEMS.map((it, i) => (
        <div
          key={i}
          className={'bd-item ' + (it.t === 'star' ? 'bd-star' : 'bd-flower')}
          style={{
            '--x': it.x, '--y': it.y, '--s': it.s + 'px',
            '--dx': it.dx + 'px', '--dy': it.dy + 'px',
            '--r': it.r + 'deg', '--d': it.d + 's', '--delay': it.delay + 's',
          }}
        >
          {it.t === 'star' ? <Star color={it.c} /> : <Flower />}
        </div>
      ))}
    </div>
  )
}