// create-many-question.dto.ts
import { Type } from 'class-transformer';
import { ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateQuestionDto } from 'src/modules/questions/dto/create-question.dto';

export class CreateManyQuestionDto {
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(1)
  questions: CreateQuestionDto[];
}
