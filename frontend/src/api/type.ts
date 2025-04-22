interface WhiteboardItem {
  id: string
  type: string
  props: Record<string, any>
  created_by: string
  created_at: string
}

interface BoardInfo {
  name: string
  owner: string
  created_at: string
}

interface Cursor {
  x: number
  y: number
}

interface Board {
  id: string
  info: BoardInfo
  items: WhiteboardItem[]
  cursors: Record<string, Cursor>
}