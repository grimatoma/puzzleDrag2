import { describe, it, expect, vi, beforeEach } from "vitest";
import { rounded, drawCuteVine, canvasTexture, regenerateTextures, makeTextures, drawTileIcon } from "../textures.js";
import { BIOMES } from "../constants.js";
import * as farmIcons from "../textures/farmIcons.js";
import * as mineIcons from "../textures/mineIcons.js";
import * as iconRegistry from "../textures/iconRegistry.js";

describe("textures", () => {
  let mockGraphics: any;
  let mockContext: any;
  let mockTexture: any;
  let mockTextures: any;
  let mockScene: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGraphics = {
      fillStyle: vi.fn(),
      fillRoundedRect: vi.fn(),
      lineStyle: vi.fn(),
      strokeRoundedRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      strokePath: vi.fn(),
    };

    mockContext = {
      clearRect: vi.fn(),
      fillStyle: "",
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      lineWidth: 0,
      strokeStyle: "",
      stroke: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      restore: vi.fn(),
      arc: vi.fn(),
      bezierCurveTo: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      quadraticCurveTo: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRoundedRect: vi.fn(),
      lineTo: vi.fn(),
      clip: vi.fn(),
      setLineDash: vi.fn(),
      rect: vi.fn(),
    };

    mockTexture = {
      getContext: vi.fn().mockReturnValue(mockContext),
      refresh: vi.fn(),
    };

    mockTextures = {
      exists: vi.fn().mockReturnValue(false),
      remove: vi.fn(),
      createCanvas: vi.fn().mockReturnValue(mockTexture),
    };

    const mockSprite = { setTexture: vi.fn() };

    mockScene = {
      add: { graphics: vi.fn().mockReturnValue(mockGraphics) },
      textures: mockTextures,
      registry: {
        get: vi.fn().mockReturnValue({ scaleFor: vi.fn().mockReturnValue(1) }),
      },
      grid: [
        [{ selected: false, res: { key: "stone" }, sprite: mockSprite }],
      ],
    } as any;
  });

  describe("rounded", () => {
    it("draws a filled rounded rect", () => {
      rounded(mockScene, 10, 20, 100, 50, 5, 0xff0000, 0.5);
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(0xff0000, 0.5);
      expect(mockGraphics.fillRoundedRect).toHaveBeenCalledWith(10, 20, 100, 50, 5);
      expect(mockGraphics.lineStyle).not.toHaveBeenCalled();
    });

    it("draws a stroked rounded rect when stroke is provided", () => {
      rounded(mockScene, 0, 0, 10, 10, 2, 0x000000, 1, 0xffffff, 2, 0.8);
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(2, 0xffffff, 0.8);
      expect(mockGraphics.strokeRoundedRect).toHaveBeenCalledWith(0, 0, 10, 10, 2);
    });
  });

  describe("drawCuteVine", () => {
    it("draws a vine path", () => {
      drawCuteVine(mockScene, 0, 0, 100);
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(4, 0x6da53a, 0.95);
      expect(mockGraphics.beginPath).toHaveBeenCalled();
      expect(mockGraphics.moveTo).toHaveBeenCalled();
      expect(mockGraphics.lineTo).toHaveBeenCalled();
      expect(mockGraphics.strokePath).toHaveBeenCalled();
    });
  });

  describe("canvasTexture", () => {
    it("creates canvas texture, calls draw, and refreshes", () => {
      const drawFn = vi.fn();
      canvasTexture(mockScene, "test-key", 50, 50, drawFn, 2);

      expect(mockTextures.exists).toHaveBeenCalledWith("test-key");
      expect(mockTextures.createCanvas).toHaveBeenCalledWith("test-key", 100, 100);
      expect(mockTexture.getContext).toHaveBeenCalled();
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
      expect(drawFn).toHaveBeenCalledWith(mockContext, 50, 50);
      expect(mockTexture.refresh).toHaveBeenCalled();
    });

    it("does nothing if texture already exists", () => {
      mockTextures.exists.mockReturnValue(true);
      const drawFn = vi.fn();
      canvasTexture(mockScene, "test-key", 50, 50, drawFn);
      expect(mockTextures.createCanvas).not.toHaveBeenCalled();
    });
  });

  describe("regenerateTextures", () => {
    it("removes existing textures and triggers canvas creations", () => {
      mockTextures.exists.mockReturnValue(true);
      mockScene.registry.get = vi.fn().mockReturnValue({ scaleFor: vi.fn().mockReturnValue(1) });
      regenerateTextures(mockScene);

      // Should remove existing textures before recreating
      expect(mockTextures.remove).toHaveBeenCalled();
      // Should set sprite texture based on grid
      expect(mockScene.grid[0][0].sprite.setTexture).toHaveBeenCalledWith("tile_stone");
    });
  });

  describe("makeTextures", () => {
    it("generates expected tile and effect textures", () => {
      mockScene.registry.get = vi.fn().mockReturnValue({ scaleFor: vi.fn().mockReturnValue(1) });
      makeTextures(mockScene);
      // Spark, fire, seasons
      expect(mockTextures.createCanvas).toHaveBeenCalled();
    });
  });

  describe("drawTileIcon", () => {
     it("routes to farmIcons for known farm items", () => {
       const spy = vi.spyOn(farmIcons, "drawFarmTileIcon").mockImplementation(() => {});
       drawTileIcon(mockContext as any, "wheat");
       expect(spy).toHaveBeenCalledWith(mockContext, "wheat");
       spy.mockRestore();
     });

     it("routes to mineIcons for known mine items", () => {
       const spy = vi.spyOn(mineIcons, "drawMineTileIcon").mockImplementation(() => {});
       drawTileIcon(mockContext as any, "stone");
       expect(spy).toHaveBeenCalledWith(mockContext, "stone");
       spy.mockRestore();
     });

     it("routes to iconRegistry for unregistered icons", () => {
       const spy = vi.spyOn(iconRegistry, "drawIcon").mockImplementation(() => {});
       drawTileIcon(mockContext as any, "something_else");
       expect(spy).toHaveBeenCalledWith(mockContext, "something_else");
       spy.mockRestore();
     });
  });
});
