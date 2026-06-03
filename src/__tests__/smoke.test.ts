describe("test harness", () => {
  it("runs in jsdom with globals available", () => {
    expect(typeof window).toBe("object");
    expect(window.document.body).toBeTruthy();
  });

  it("creates and revokes object URLs without throwing", () => {
    const blob = new Blob(["x"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });
});
