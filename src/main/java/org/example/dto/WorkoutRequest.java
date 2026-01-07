package org.example.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WorkoutRequest(
        UUID userId,
        LocalDate date,
        String template,
        String notes,
        List<ExerciseBlock> exercises
) {}
