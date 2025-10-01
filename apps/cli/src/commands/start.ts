import { X402Runner } from "../lib";

export async function start(options: { config?: string }) {
  try {
    const runner = await X402Runner.create(options.config);
    await runner.start();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
