import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObjectStorage } from './object-storage.abstract';
import { R2ObjectStorage } from './r2-object-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ObjectStorage,
      useClass: R2ObjectStorage,
    },
    R2ObjectStorage,
  ],
  exports: [ObjectStorage, R2ObjectStorage],
})
export class StorageModule {}
