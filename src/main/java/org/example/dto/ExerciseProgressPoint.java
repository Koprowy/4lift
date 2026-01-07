package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExerciseProgressPoint(
        LocalDate date,
        BigDecimal maxWeight
) {}
