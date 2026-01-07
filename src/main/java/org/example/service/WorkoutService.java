package org.example.service;

import lombok.RequiredArgsConstructor;
import org.example.dto.WorkoutRequest;
import org.example.model.SetEntity;
import org.example.model.Workout;
import org.example.model.WorkoutExercise;
import org.example.repository.WorkoutRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private final WorkoutRepository workoutRepository;

    public void saveWorkout(WorkoutRequest request) {

        Workout workout = new Workout();
        workout.setUserId(request.userId());
        workout.setWorkoutDate(request.date());
        workout.setTemplateName(request.template());
        workout.setNotes(request.notes());

        List<WorkoutExercise> exercises = request.exercises().stream().map(ex -> {
            WorkoutExercise we = new WorkoutExercise();
            we.setWorkout(workout);
            we.setExerciseName(ex.name());
            we.setExerciseOrder(ex.order());

            List<SetEntity> sets = ex.sets().stream().map(s -> {
                SetEntity set = new SetEntity();
                set.setWorkoutExercise(we);
                set.setWeight(s.weight());
                set.setReps(s.reps());
                set.setSetOrder(s.order());
                set.setDrop(s.isDrop());
                set.setParentSetId(s.parentSetId());
                return set;
            }).toList();

            we.setSets(sets);
            return we;
        }).toList();

        workout.setExercises(exercises);

        workoutRepository.save(workout);
    }

}
