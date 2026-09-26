export interface NodeDefinition {
  id: string
  name: string
  x: number
  y: number
  /** relative pollution intensity multiplier applied to the active scenario */
  intensity: number
  zone: string
}

export const MAP_NODES: NodeDefinition[] = [
  { id: 'node-01', name: 'NODE 01 · Main Road', x: 22, y: 30, intensity: 1.35, zone: 'Main Road' },
  { id: 'node-02', name: 'NODE 02 · Classroom Block', x: 62, y: 20, intensity: 0.55, zone: 'Classroom Block' },
  { id: 'node-03', name: 'NODE 03 · Canteen', x: 78, y: 52, intensity: 0.95, zone: 'Canteen' },
  { id: 'node-04', name: 'NODE 04 · Construction Site', x: 38, y: 68, intensity: 1.6, zone: 'Construction Site' },
  { id: 'node-05', name: 'NODE 05 · Residential Block', x: 15, y: 78, intensity: 0.65, zone: 'Residential Block' },
]
