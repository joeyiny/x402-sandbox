import { createAnvil, type Anvil } from "@viem/anvil";

export class NodeManager {
  private anvil: Anvil | null = null;

  async checkInstallation(): Promise<boolean> {
    // @viem/anvil handles installation automatically
    return true;
  }

  async startNode(options: { port?: number } = {}): Promise<void> {
    const port = options.port || 8545;

    if (this.anvil) {
      await this.stopNode();
    }

    // @viem/anvil will automatically download anvil if not installed
    this.anvil = createAnvil({
      port,
      accounts: 10,
      balance: 10000,
      mnemonic: "test test test test test test test test test test test junk",
      silent: false, // Show output for debugging
      startTimeout: 60000, // Increase timeout to 60 seconds for download
    });

    await this.anvil.start();
  }

  async stopNode(): Promise<void> {
    if (this.anvil) {
      await this.anvil.stop();
      this.anvil = null;
    }
  }

  async resetNode(): Promise<void> {
    if (this.anvil) {
      const port = this.anvil.port;
      await this.stopNode();
      await this.startNode({ port });
    }
  }

  isRunning(): boolean {
    return this.anvil !== null && this.anvil.status === "listening";
  }
}
