// โลโก้ตัวอักษร Phrase & Place (ไฟล์ public/logo.png ขนาด 512x99 พื้นโปร่งใส)
const RATIO = 512 / 99

export default function Logo({ height = 44, className = '' }) {
  return (
    <img
      className={'logo ' + className}
      src="/logo.png"
      alt="Phrase & Place"
      width={Math.round(height * RATIO)}
      height={height}
      draggable={false}
    />
  )
}