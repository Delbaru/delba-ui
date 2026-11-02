/** Owns one pending media operation; a newer user action cancels and invalidates the previous one. */
export class MediaOperationOwner {
    private generation = 0;
    private controller: AbortController | undefined;

    begin() {
        this.cancel();
        const generation = this.generation;
        const controller = new AbortController();
        this.controller = controller;

        return {
            signal: controller.signal,
            isCurrent: () => generation === this.generation,
            finish: () => {
                if (generation === this.generation) this.controller = undefined;
            },
        };
    }

    cancel() {
        this.generation += 1;
        this.controller?.abort();
        this.controller = undefined;
    }
}
