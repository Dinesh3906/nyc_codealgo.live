import 'dotenv/config';
import { httpServer } from './app';

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Brickly Server running on port ${PORT}`);
});
