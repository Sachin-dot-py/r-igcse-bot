export const selectRandomItems = (array: any[], numItems: number) => {
	const selectedItems = [];

	while (selectedItems.length < numItems && array.length > 0) {
		const randomIndex = Math.floor(Math.random() * array.length);

		selectedItems.push(array.splice(randomIndex, 1)[0]);
	}

	return selectedItems;
};
