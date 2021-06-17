export class CallbackFiller {
  public queues: any;

  constructor() {
    this.queues = {};
  }

  public fill(key: any, err: any, data?: any) {
    const waiting = this.queues[key];
    delete this.queues[key];

    if (waiting && waiting.length) {
        waiting.forEach((task: any) => {
            (task.cb)(err, data);
        });
    }
  }

  public has(key: any) {
    return this.queues[key];
  }

  public add(key: any, funcObj: any) {
    if (this.queues[key]) {
      this.queues[key].push(funcObj);
    } else {
      this.queues[key] = [funcObj];
    }
  }
}