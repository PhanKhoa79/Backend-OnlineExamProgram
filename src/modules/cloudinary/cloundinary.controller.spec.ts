import { Test, TestingModule } from '@nestjs/testing';
import { CloundinaryController } from './cloundinary.controller';

describe('CloundinaryController', () => {
  let controller: CloundinaryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CloundinaryController],
    }).compile();

    controller = module.get<CloundinaryController>(CloundinaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
