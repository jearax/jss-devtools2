import { sample } from '../../commands/doctor/sample.service.js';

export const read = (): string => {
	return sample();
};
