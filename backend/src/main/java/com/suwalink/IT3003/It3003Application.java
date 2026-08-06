package com.suwalink.IT3003;

import com.suwalink.IT3003.config.DatabaseStartupWaiter;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
public class It3003Application {

	public static void main(String[] args) {
		new SpringApplicationBuilder(It3003Application.class)
				.listeners(new DatabaseStartupWaiter())
				.run(args);
	}

}
