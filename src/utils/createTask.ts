const createTask = (handler: Bun.TimerHandler, interval: number) => {
	handler();
	setInterval(handler, interval);
};

export default createTask;
