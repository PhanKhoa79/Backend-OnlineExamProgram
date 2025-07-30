import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StudentExamSessions } from '../../database/entities/StudentExamSessions';
import { ExamScheduleAssignments } from '../../database/entities/ExamScheduleAssignments';

/**
 * Kiểm tra xem học sinh có đang tham gia vào phòng thi nào không
 * @param studentExamSessionsRepo Repository của StudentExamSessions
 * @param studentId ID của học sinh cần kiểm tra
 * @throws BadRequestException nếu học sinh đang tham gia phòng thi
 */
export async function checkActiveStudentExams(
  studentExamSessionsRepo: Repository<StudentExamSessions>,
  studentId: number,
): Promise<void> {
  const activeExamSessions = await studentExamSessionsRepo
    .createQueryBuilder('session')
    .leftJoinAndSelect('session.assignment', 'assignment')
    .leftJoinAndSelect('assignment.class', 'class')
    .leftJoinAndSelect('assignment.examSchedule', 'schedule')
    .leftJoinAndSelect('schedule.subject', 'subject')
    .where('session.student_id = :studentId', { studentId })
    .andWhere('session.status = :status', { status: 'active' })
    .andWhere('assignment.status = :assignmentStatus', {
      assignmentStatus: 'open',
    })
    .getMany();

  if (activeExamSessions.length > 0) {
    // eslint-disable-next-line prettier/prettier
    const examInfo = activeExamSessions
      .map((session) => {
        return `- Môn: ${session.assignment.examSchedule.subject?.name || 'Không xác định'}, Lớp: ${session.assignment.class?.name || 'Không xác định'}`;
      })
      .join('\n');

    throw new BadRequestException(
      `Không thể thực hiện hành động này khi học sinh đang tham gia phòng thi:\n${examInfo}`,
    );
  }
}

/**
 * Kiểm tra xem lớp học có đang có phòng thi nào đang mở không
 * @param examScheduleAssignmentsRepo Repository của ExamScheduleAssignments
 * @param classId ID của lớp học cần kiểm tra
 * @throws BadRequestException nếu lớp học đang có phòng thi mở
 */
export async function checkActiveClassExams(
  examScheduleAssignmentsRepo: Repository<ExamScheduleAssignments>,
  classId: number,
): Promise<void> {
  const activeExams = await examScheduleAssignmentsRepo
    .createQueryBuilder('assignment')
    .leftJoinAndSelect('assignment.examSchedule', 'schedule')
    .leftJoinAndSelect('schedule.subject', 'subject')
    .where('assignment.class_id = :classId', { classId })
    .andWhere('assignment.status = :status', { status: 'open' })
    .getMany();

  if (activeExams.length > 0) {
    const examInfo = activeExams
      .map((exam) => {
        return `- Môn: ${exam.examSchedule.subject?.name || 'Không xác định'}, Mã phòng: ${exam.code}`;
      })
      .join('\n');

    throw new BadRequestException(
      `Không thể thực hiện hành động này khi lớp đang có phòng thi mở:\n${examInfo}`,
    );
  }
}
