import { TestBed } from "@angular/core/testing";
import { CoreService } from "../services/core.service";
import { supabase } from "../../../supabase/supabaseClient";

describe("App Core Functionality", () => {
    let service: CoreService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [CoreService],
        });
        service = TestBed.inject(CoreService);
    });

    it("should authenticate with Supabase", async () => {
        const { data, error } = await supabase.auth.getSession();
        expect(error).toBeNull();
        expect(data).toBeDefined();
    });

    it("should generate and validate codes", async () => {
        const userId = "test-user";
        const code = await service.generateCode(userId);
        expect(code).toBeDefined();
        expect(code.length).toBeGreaterThan(0);

        const isValid = await service.validateCode(code);
        expect(isValid).toBeTruthy();
    });

    it("should handle code claims", async () => {
        const userId = "test-user";
        const code = await service.generateCode(userId);
        const claimResult = await service.claimCode(code, userId);
        expect(claimResult).toBeTruthy();
    });

    it("should track watch time", () => {
        const initialTime = service["watchTime"];
        service["startCounter"]();
        setTimeout(() => {
            service["stopCounter"]();
            expect(service["watchTime"]).toBeGreaterThan(initialTime);
        }, 1000);
    });
});
