package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.dto.WorkoutRequest;
import org.example.model.Workout;
import org.example.repository.WorkoutRepository;
import org.example.service.WorkoutService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkoutController {

    private final WorkoutService workoutService;
    private final WorkoutRepository workoutRepository;

    // ✅ POST – zapis treningu
    @PostMapping
    public void saveWorkout(@RequestBody WorkoutRequest request) {
        workoutService.saveWorkout(request);
    }

    // ✅ GET – historia treningów
    @GetMapping
    public List<Workout> getWorkouts(@RequestParam UUID userId) {
        return workoutRepository.findByUserIdOrderByWorkoutDateDesc(userId);
    }

    @GetMapping("/day")
    public List<Workout> getWorkoutByDay(
            @RequestParam UUID userId,
            @RequestParam String date
    ) {
        return workoutRepository.findByUserIdAndWorkoutDate(userId, LocalDate.parse(date));
    }
    @DeleteMapping("/{id}")
    public void deleteWorkout(@PathVariable UUID id) {
        workoutRepository.deleteById(id);
    }


}
