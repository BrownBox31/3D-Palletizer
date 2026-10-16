export type WorkflowStepId =
  | 'pallet'
  | 'product'
  | 'layer'
  | 'build'
  | 'robot'
  | 'run';

export type WorkflowStep = {
  id: WorkflowStepId;
  index: number;
  label: string;
  short: string;
  path: string;
  description: string;
};

/** Guided setup + production flow used by wizard shell + dashboard */
export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'pallet',
    index: 1,
    label: 'Pallet Config',
    short: 'Pallet',
    path: '/pallet',
    description: 'Define pallet size and max weight',
  },
  {
    id: 'product',
    index: 2,
    label: 'Product Config',
    short: 'Product',
    path: '/item',
    description: 'Define SKU dimensions and labels',
  },
  {
    id: 'layer',
    index: 3,
    label: 'Layer Builder',
    short: 'Layer',
    path: '/layout',
    description: 'Design custom stacking patterns',
  },
  {
    id: 'build',
    index: 4,
    label: 'Build Composer',
    short: 'Build',
    path: '/build-composer',
    description: 'Stack layers into a full pallet',
  },
  {
    id: 'robot',
    index: 5,
    label: 'Robot Placement',
    short: 'Robot',
    path: '/robot-placement',
    description: 'Assign builds to stations',
  },
  {
    id: 'run',
    index: 6,
    label: 'Operator Run',
    short: 'Run',
    path: '/run',
    description: 'Select recipe and run production',
  },
];

export function getStepByPath(pathname: string): WorkflowStep | undefined {
  return WORKFLOW_STEPS.find(
    (s) => pathname === s.path || pathname.startsWith(s.path + '/')
  );
}

export function getAdjacentSteps(pathname: string) {
  const current = getStepByPath(pathname);
  if (!current) return { prev: undefined, next: undefined, current: undefined };
  const idx = WORKFLOW_STEPS.findIndex((s) => s.id === current.id);
  return {
    current,
    prev: idx > 0 ? WORKFLOW_STEPS[idx - 1] : undefined,
    next: idx < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[idx + 1] : undefined,
  };
}
