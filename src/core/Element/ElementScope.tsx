'use client';

import type { ReactNode } from 'react';
import { FormContext, type FormScope } from '../Form';
import { CollectionContext, type CollectionScope } from '../Collection';
import { DisclosureScope, type DisclosureController } from '../Disclosure';
import { SmoothScope, type SmoothScrollApi } from '../Scroll/Smooth';

export interface ElementScopeProps {
    scope?: {
        form?: FormScope;
        collection?: CollectionScope;
        disclosure?: DisclosureController;
        smooth?: SmoothScrollApi;
    };
    children: ReactNode;
}

export function ElementScope({ scope, children }: ElementScopeProps) {
    let content = children;
    if (scope?.form) content = <FormContext form={scope.form}>{content}</FormContext>;
    if (scope?.collection) content = <CollectionContext collection={scope.collection}>{content}</CollectionContext>;
    if (scope?.disclosure) content = <DisclosureScope disclosure={scope.disclosure}>{content}</DisclosureScope>;
    if (scope?.smooth) content = <SmoothScope controller={scope.smooth}>{content}</SmoothScope>;
    return content;
}
