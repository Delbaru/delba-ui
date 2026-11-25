import { focusableElements } from '../../../../src/index';

declare const scope: ParentNode | null;
const candidates: HTMLElement[] = focusableElements(scope);
void candidates;
