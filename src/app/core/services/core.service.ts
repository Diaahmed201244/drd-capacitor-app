import { Injectable } from "@angular/core";
import { supabase } from "../../../supabase/supabaseClient";
import { environment } from "../../../environment";

@Injectable({
    providedIn: "root",
})
export class CoreService {
    private player: any;
    private watchTime: number;
    private timerInterval: NodeJS.Timeout | null;
    private videoId: string;
    private channelId: string;

    constructor() {
        this.watchTime = parseInt(localStorage.getItem("watchTime") || "0");
        this.timerInterval = null;
        this.videoId = environment.defaultVideoId;
        this.channelId = environment.defaultChannelId;
        this.initYouTubeAPI();
    }

    // Auth Methods
    async signIn(email: string, password: string) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error signing in:", error);
            throw error;
        }
    }

    async signUp(email: string, password: string) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error signing up:", error);
            throw error;
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error("Error getting current user:", error);
            throw error;
        }
    }

    // Code Methods
    async generateCode(userId: string): Promise<string> {
        try {
            const code = this.generateSecureCode();
            const { error } = await supabase
                .from("codes")
                .insert({
                    code,
                    user_id: userId,
                    created_at: new Date().toISOString(),
                });

            if (error) throw error;
            return code;
        } catch (error) {
            console.error("Error generating code:", error);
            throw error;
        }
    }

    async validateCode(code: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from("codes")
                .select("*")
                .eq("code", code)
                .single();

            if (error) throw error;
            return !!data;
        } catch (error) {
            console.error("Error validating code:", error);
            return false;
        }
    }

    async claimCode(code: string, userId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from("codes")
                .select("*")
                .eq("code", code)
                .single();

            if (error) throw error;
            if (!data) return false;

            const { error: updateError } = await supabase
                .from("codes")
                .update({
                    claimed_by: userId,
                    claimed_at: new Date().toISOString(),
                })
                .eq("code", code);

            if (updateError) throw updateError;
            return true;
        } catch (error) {
            console.error("Error claiming code:", error);
            return false;
        }
    }

    private generateSecureCode(): string {
        const length = 8;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";

        const timestamp = Date.now().toString(36);
        code += timestamp;

        for (let i = 0; i < length - timestamp.length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return code;
    }

    // Video Methods
    private initYouTubeAPI() {
        if (!(window as any).YT) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName("script")[0];
            if (firstScriptTag?.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }

            (window as any).onYouTubeIframeAPIReady = () => {
                this.createPlayer("video-container");
            };
        } else {
            this.createPlayer("video-container");
        }
    }

    createPlayer(elementId: string) {
        this.player = new (window as any).YT.Player(elementId, {
            height: "360",
            width: "640",
            videoId: this.videoId,
            playerVars: {
                "playsinline": 1,
                "controls": 1,
                "rel": 0,
            },
            events: {
                "onStateChange": this.onPlayerStateChange.bind(this),
            },
        });
    }

    private onPlayerStateChange(event: any) {
        if (event.data === (window as any).YT.PlayerState.PLAYING) {
            this.startCounter();
        } else {
            this.stopCounter();
        }
    }

    private startCounter() {
        if (!this.timerInterval) {
            this.timerInterval = setInterval(() => {
                this.watchTime += 100;
                localStorage.setItem("watchTime", this.watchTime.toString());
            }, 100);
        }
    }

    private stopCounter() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Utility Methods
    static disableContextMenu() {
        document.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    static preventReload() {
        window.addEventListener("keydown", (e) => {
            if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
                e.preventDefault();
            }
        });
    }

    static handleOrientationChange(
        onPortrait: () => void,
        onLandscape: () => void,
    ) {
        window.addEventListener("orientationchange", () => {
            if (window.orientation === 0 || window.orientation === 180) {
                onPortrait();
            } else {
                onLandscape();
            }
        });
    }

    // Cleanup Methods
    async cleanupExpiredCodes(): Promise<void> {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(
                expirationDate.getDate() - environment.storageRetentionDays,
            );

            const { error } = await supabase
                .from("codes")
                .delete()
                .lt("created_at", expirationDate.toISOString());

            if (error) throw error;
        } catch (error) {
            console.error("Error cleaning up expired codes:", error);
            throw error;
        }
    }
}
