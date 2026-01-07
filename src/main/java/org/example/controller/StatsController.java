package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.dto.ExerciseProgressPoint;
import org.example.repository.StatsRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StatsController {

    private final StatsRepository statsRepository;

    @GetMapping("/exercise")
    public List<ExerciseProgressPoint> exercise(
            @RequestParam UUID userId,
            @RequestParam String name
    ) {
        return statsRepository.exerciseProgress(userId, name);
    }
}
