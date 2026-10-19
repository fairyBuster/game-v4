// One modal for every popup in the app (deposit, withdraw, entry info, FAQ...).
export default function Modal({ title, art, children, actions = [], onClose }) {
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="round" onClick={onClose} aria-label="Tutup">×</button>
        </header>
        {art ? <img className="modal-art" src={art} alt="" /> : null}
        <div className="modal-body">{children}</div>
        {actions.length ? (
          <div className="modal-actions">
            {actions.map((a) => (
              <button key={a.label} className={`btn ${a.kind || 'gold'}`} disabled={a.disabled}
                      onClick={a.onClick}>{a.label}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
