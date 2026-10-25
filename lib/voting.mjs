import { randomUUID } from "node:crypto";
export function installVoting(Engine) {
  Engine.prototype.openVote = function ({ productIds, duration = 30 }) {
    this.tick();
    if (this.state.vote?.status === "open")
      throw Error("Finish the current vote first.");
    if (
      !Array.isArray(productIds) ||
      productIds.length < 2 ||
      productIds.length > 3 ||
      new Set(productIds).size !== productIds.length
    )
      throw Error("Choose two or three different products.");
    duration = Number(duration);
    if (!Number.isInteger(duration) || duration < 10 || duration > 120)
      throw Error("Vote duration must be 10–120 seconds.");
    const options = productIds.map((id, i) => {
      const p = this.product(id);
      if (p.quantity < 1) throw Error("Vote products must be in stock.");
      if (
        this.state.auction?.productId === id &&
        ["live", "paused"].includes(this.state.auction.status)
      )
        throw Error("Choose products outside the current auction.");
      return { productId: id, number: i + 1, product: structuredClone(p) };
    });
    this.state.vote = {
      id: randomUUID(),
      status: "open",
      mode: this.state.mode,
      endsAt: this.now() + duration * 1000,
      options,
      ballots: {},
      counts: options.map(() => 0),
      winner: null,
    };
    this.say(
      "Chat picks the next drop! Type !vote 1, !vote 2" +
        (options.length === 3 ? " or !vote 3" : "") +
        ".",
      "excited",
    );
    this.activity("Next-drop vote opened.", "vote");
    this.commit();
    return this.state.vote;
  };
  Engine.prototype.vote = function ({ userId, option, source = "demo" }) {
    this.tick();
    const v = this.state.vote;
    if (v?.status !== "open") throw Error("Voting is closed.");
    if (
      !userId ||
      !Number.isInteger(Number(option)) ||
      !v.options[Number(option) - 1]
    )
      throw Error("Choose a valid vote number.");
    if (v.mode === "live" && source !== "twitch")
      throw Error("Live votes require Twitch identity.");
    if (this.state.blocked.some((r) => r.userId === userId))
      throw Error("Voting is disabled for this account.");
    v.ballots["user:" + userId] = Number(option);
    v.counts = v.options.map(
      (o) => Object.values(v.ballots).filter((n) => n === o.number).length,
    );
    this.commit();
    return v;
  };
  Engine.prototype.closeVote = function (cancel = false) {
    const v = this.state.vote;
    if (v?.status !== "open") throw Error("No open vote.");
    v.status = cancel ? "cancelled" : "closed";
    if (!cancel) {
      const max = Math.max(...v.counts);
      v.winner = max > 0 ? v.options[v.counts.indexOf(max)].productId : null;
      this.say(
        v.winner
          ? `${v.options.find((o) => o.productId === v.winner).product.title} wins the vote! Ready for the next auction.`
          : "No votes this round. Pick your next lot from the lineup.",
        "happy",
      );
    }
    this.activity(`Next-drop vote ${v.status}.`, "vote");
    this.commit();
    return v;
  };
}
export function publicVote(v) {
  if (!v) return null;
  const { ballots, ...safe } = v;
  return { ...safe, voters: Object.keys(ballots).length };
}
