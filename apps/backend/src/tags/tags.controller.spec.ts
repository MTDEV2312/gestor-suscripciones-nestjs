import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';

describe('TagsController', () => {
  let controller: TagsController;
  let service: jest.Mocked<TagsService>;

  const mockTag: Tag = {
    id: 'tag-1',
    name: 'Work',
    color: '#0000FF',
    user_id: 'user-1',
    created_at: new Date(),
    user: {} as any,
    subscriptions: [],
  };

  const req = {
    user: {
      id: 'user-1',
      username: 'user1',
      email: 'user1@example.com',
    },
  } as any;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create', async () => {
    service.create.mockResolvedValue(mockTag);
    const dto = { name: 'Work', color: '#0000FF' };
    const result = await controller.create(dto, req);
    expect(service.create).toHaveBeenCalledWith(dto, req);
    expect(result).toEqual(mockTag);
  });

  it('should call service.findAll', async () => {
    service.findAll.mockResolvedValue([mockTag]);
    const result = await controller.findAll(req);
    expect(service.findAll).toHaveBeenCalledWith(req);
    expect(result).toEqual([mockTag]);
  });

  it('should call service.findOne', async () => {
    service.findOne.mockResolvedValue(mockTag);
    const result = await controller.findOne('tag-1', req);
    expect(service.findOne).toHaveBeenCalledWith('tag-1', req);
    expect(result).toEqual(mockTag);
  });

  it('should call service.update', async () => {
    service.update.mockResolvedValue({ ...mockTag, name: 'Updated' });
    const dto = { name: 'Updated' };
    const result = await controller.update('tag-1', dto, req);
    expect(service.update).toHaveBeenCalledWith('tag-1', dto, req);
    expect(result.name).toBe('Updated');
  });

  it('should call service.remove', async () => {
    service.remove.mockResolvedValue({ message: 'Etiqueta eliminada exitosamente' });
    const result = await controller.remove('tag-1', req);
    expect(service.remove).toHaveBeenCalledWith('tag-1', req);
    expect(result).toEqual({ message: 'Etiqueta eliminada exitosamente' });
  });
});
