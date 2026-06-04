import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import type { OutlineNode } from '../../types'

function NodeView({ node }: { node: OutlineNode }) {
  const requestScroll = useStore((s) => s.requestScroll)
  return (
    <div className="outline-node">
      <button
        className="outline-node__row"
        disabled={!node.page}
        onClick={() => node.page && requestScroll(node.page)}
      >
        <span>{node.title}</span>
        {node.page ? <span className="outline-node__page">{node.page}</span> : null}
      </button>
      {node.items.length > 0 && (
        <div className="outline-children">
          {node.items.map((c, i) => (
            <NodeView key={i} node={c} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OutlinePanel() {
  const outline = useStore((s) => s.outline)
  const m = useMessages()
  if (!outline.length) return <div className="empty-hint">{m.noOutline}</div>
  return (
    <div>
      {outline.map((n, i) => (
        <NodeView key={i} node={n} />
      ))}
    </div>
  )
}
