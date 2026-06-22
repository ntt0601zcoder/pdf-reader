import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useStore } from '../../store/useStore'
import { useMessages } from '../../hooks/useMessages'
import type { OutlineNode } from '../../types'

/**
 * The outline node for the section the reader is currently in: the one with the
 * greatest resolved page that is still <= the current page (document order, so
 * ties resolve to the deepest/last matching subsection).
 */
function findActiveNode(nodes: OutlineNode[], currentPage: number): OutlineNode | null {
  let best: OutlineNode | null = null
  const walk = (list: OutlineNode[]) => {
    for (const n of list) {
      if (n.page != null && n.page <= currentPage && (best === null || n.page >= best.page!)) {
        best = n
      }
      if (n.items.length) walk(n.items)
    }
  }
  walk(nodes)
  return best
}

function NodeView({
  node,
  activeNode,
  activeRef,
}: {
  node: OutlineNode
  activeNode: OutlineNode | null
  activeRef: RefObject<HTMLButtonElement>
}) {
  const requestScroll = useStore((s) => s.requestScroll)
  const isActive = node === activeNode
  return (
    <div className="outline-node">
      <button
        ref={isActive ? activeRef : undefined}
        className={`outline-node__row${isActive ? ' is-active' : ''}`}
        disabled={!node.page}
        onClick={() => node.page && requestScroll(node.page)}
      >
        <span>{node.title}</span>
        {node.page ? <span className="outline-node__page">{node.page}</span> : null}
      </button>
      {node.items.length > 0 && (
        <div className="outline-children">
          {node.items.map((c, i) => (
            <NodeView key={i} node={c} activeNode={activeNode} activeRef={activeRef} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OutlinePanel() {
  const outline = useStore((s) => s.outline)
  const currentPage = useStore((s) => s.currentPage)
  const m = useMessages()
  const activeRef = useRef<HTMLButtonElement>(null)
  // NB: select the stable `outline` array + derive — never return a fresh array
  // from a selector (would loop zustand v5).
  const activeNode = useMemo(() => findActiveNode(outline, currentPage), [outline, currentPage])

  // Bring the current section into view when the panel opens and follow it as
  // the reader moves between sections.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' })
  }, [activeNode])

  if (!outline.length) return <div className="empty-hint">{m.noOutline}</div>
  return (
    <div>
      {outline.map((n, i) => (
        <NodeView key={i} node={n} activeNode={activeNode} activeRef={activeRef} />
      ))}
    </div>
  )
}
