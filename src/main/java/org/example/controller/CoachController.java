package org.example.controller;

import org.example.dto.CoachYoutubeResponse;
import org.example.service.CoachAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/coach")
public class CoachController {

    private final CoachAiService coachAiService;

    public CoachController(CoachAiService coachAiService) {
        this.coachAiService = coachAiService;
    }

    @GetMapping("/youtube")
    public ResponseEntity<CoachYoutubeResponse> youtube(
            @RequestParam String text,
            @RequestParam(defaultValue = "pl") String lang
    ) {
        var res = coachAiService.resolve(text, lang);
        if (!res.ok()) return ResponseEntity.noContent().build();

        String encoded = URLEncoder.encode(res.youtubeQuery(), StandardCharsets.UTF_8);
        String url = "https://www.youtube.com/results?search_query=" + encoded;

        return ResponseEntity.ok(new CoachYoutubeResponse(
                text,
                res.canonical(),
                res.youtubeQuery(),
                url
        ));
    }
}
