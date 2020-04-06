import { EntityRepository, Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './task-status.enum';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { User } from '../auth/user.entity';
import { InternalServerErrorException, Logger } from '@nestjs/common';

@EntityRepository(Task)
export class TaskRepository extends Repository<Task> {
  private logger = new Logger('TaskRepository');
  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;
    const task = new Task();
    task.title = title;
    task.description = description;
    task.status = TaskStatus.OPEN;
    task.user = user;
    await task.save();
    delete task.user;
    return task;
  }

  async getTasks(filterDto: GetTasksFilterDto, user: User): Promise<Task[]> {
    const { status, search } = filterDto;
    const query = this.createQueryBuilder('task').where(
      'task.userId = :userId',
      { userId: user.id },
    );
    if (status) {
      query.andWhere('task.status = :status', { status });
    }
    if (search) {
      query.andWhere('task.title LIKE :search', { search: `%${search}%` });
      query.orWhere('task.description LIKE :search', { search: `%${search}%` });
    }
    try {
      const tasks = await query.getMany();
      return tasks;
    } catch (e) {
      this.logger.error(
        'Failed to get tasks for user ' +
          user.username +
          ', DTO: ' +
          JSON.stringify(filterDto),
        e.stack,
      );
      throw new InternalServerErrorException();
    }
  }
}
