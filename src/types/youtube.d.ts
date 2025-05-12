declare global {
    interface Window {
        YT: typeof YT;
        onYouTubeIframeAPIReady: () => void;
    }
}

declare namespace YT {
    class Player {
        constructor(elementId: string, options: any);
    }
    namespace PlayerState {
        const PLAYING: number;
    }
}

export {};
