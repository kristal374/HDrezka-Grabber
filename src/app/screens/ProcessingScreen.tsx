import { LoadAnimation } from '../../components/Icons';
import { DefaultScreen } from './DefaultScreen';

export function ProcessingScreen() {
  return (
    <DefaultScreen className='py-12'>
      <LoadAnimation size={128} fill={'white'}></LoadAnimation>
    </DefaultScreen>
  );
}
