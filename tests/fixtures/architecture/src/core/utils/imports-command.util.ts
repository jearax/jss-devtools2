import { sample } from '../../commands/doctor/sample.service';

export const read = (): string => {
	return sample();
};
