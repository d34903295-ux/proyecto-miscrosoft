// Capa de atmósfera: una aurora ámbar/roja que deriva muy lento detrás de todo,
// grano de película sutil y una viñeta. Da profundidad "cinemática" sin tocar el
// contenido. Solo CSS (la animación se desactiva con prefers-reduced-motion).

export default function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmo-aurora" />
      <div className="atmo-grain" />
      <div className="atmo-vignette" />
    </div>
  );
}
