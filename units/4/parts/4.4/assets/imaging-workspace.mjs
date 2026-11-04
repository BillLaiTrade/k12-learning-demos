import {createBenchLayout} from './convex-bench-workspace.mjs?v=20261104-bench-proportion1';
export function createImagingWorkspace(root){const layout=createBenchLayout(root);root.dataset.hudReady='true';return {start:layout.layout,safeRect:layout.safeRect};}
