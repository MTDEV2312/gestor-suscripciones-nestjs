import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TagsService, MAX_CUSTOM_TAGS_PER_USER } from './tags.service';
import { Tag } from './entities/tag.entity';

describe('TagsService', () => {
  let service: TagsService;
  let tagRepository: jest.Mocked<Repository<Tag>>;

  const mockTag: Tag = {
    id: 'tag-uuid-1',
    name: 'Entretenimiento',
    color: '#FF0000',
    user_id: 'user-uuid-1',
    created_at: new Date(),
    user: {} as any,
    subscriptions: [],
  };

  const req = {
    user: {
      id: 'user-uuid-1',
      username: 'testuser',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const mockRepo = {
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    tagRepository = module.get(getRepositoryToken(Tag));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create tag & 50 limit enforcement', () => {
    it('should successfully create tag when tag count is under 50', async () => {
      tagRepository.count.mockResolvedValue(49);
      tagRepository.create.mockReturnValue(mockTag);
      tagRepository.save.mockResolvedValue(mockTag);

      const result = await service.create(
        { name: 'Entretenimiento', color: '#FF0000' },
        req,
      );

      expect(tagRepository.count).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid-1' },
      });
      expect(tagRepository.create).toHaveBeenCalledWith({
        name: 'Entretenimiento',
        color: '#FF0000',
        user_id: 'user-uuid-1',
      });
      expect(tagRepository.save).toHaveBeenCalledWith(mockTag);
      expect(result).toEqual(mockTag);
    });

    it('should use default color if color is not provided', async () => {
      tagRepository.count.mockResolvedValue(0);
      const tagWithDefaultColor = { ...mockTag, color: '#6B7280' };
      tagRepository.create.mockReturnValue(tagWithDefaultColor);
      tagRepository.save.mockResolvedValue(tagWithDefaultColor);

      const result = await service.create({ name: 'Trabajo' }, req);

      expect(tagRepository.create).toHaveBeenCalledWith({
        name: 'Trabajo',
        color: '#6B7280',
        user_id: 'user-uuid-1',
      });
      expect(result.color).toBe('#6B7280');
    });

    it('should throw BadRequestException when attempting to create 51st tag', async () => {
      tagRepository.count.mockResolvedValue(MAX_CUSTOM_TAGS_PER_USER);

      await expect(
        service.create({ name: 'Tag 51', color: '#00FF00' }, req),
      ).rejects.toThrow(BadRequestException);

      expect(tagRepository.count).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid-1' },
      });
      expect(tagRepository.create).not.toHaveBeenCalled();
      expect(tagRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all tags for user', async () => {
      tagRepository.find.mockResolvedValue([mockTag]);

      const result = await service.findAll(req);

      expect(tagRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid-1' },
      });
      expect(result).toEqual([mockTag]);
    });
  });

  describe('findOne', () => {
    it('should return tag by id and user_id', async () => {
      tagRepository.findOne.mockResolvedValue(mockTag);

      const result = await service.findOne('tag-uuid-1', req);

      expect(tagRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tag-uuid-1', user_id: 'user-uuid-1' },
      });
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      tagRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-tag', req)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and save tag', async () => {
      tagRepository.findOne.mockResolvedValue({ ...mockTag });
      tagRepository.save.mockImplementation((tag) => Promise.resolve(tag as Tag));

      const result = await service.update(
        'tag-uuid-1',
        { name: 'Updated Name' },
        req,
      );

      expect(result.name).toBe('Updated Name');
      expect(tagRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove tag and return success message', async () => {
      tagRepository.findOne.mockResolvedValue(mockTag);
      tagRepository.remove.mockResolvedValue(mockTag);

      const result = await service.remove('tag-uuid-1', req);

      expect(tagRepository.remove).toHaveBeenCalledWith(mockTag);
      expect(result).toEqual({ message: 'Etiqueta eliminada exitosamente' });
    });
  });
});
