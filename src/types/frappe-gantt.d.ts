declare module 'frappe-gantt' {
  interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress: number
    dependencies?: string | string[]
    custom_class?: string
  }

  interface GanttOptions {
    view_mode?: string
    date_format?: string
    bar_height?: number
    [key: string]: unknown
  }

  class Gantt {
    constructor(
      wrapper: string | HTMLElement | SVGElement,
      tasks: GanttTask[],
      options?: GanttOptions,
    )
    refresh(tasks: GanttTask[]): void
    change_view_mode(mode?: string, silent?: boolean): void
  }

  export default Gantt
}
