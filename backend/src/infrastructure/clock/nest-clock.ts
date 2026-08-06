import { Injectable } from '@nestjs/common';
import { SystemClock } from '../../queue-engine';

@Injectable()
export class NestClock extends SystemClock {}
