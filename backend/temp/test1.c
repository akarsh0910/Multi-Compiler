#include <stdio.h>

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    int num1, num2;
    printf("Enter 1st number: ");
    scanf("%d", &num1);
    printf("Enter 2nd number: ");
    scanf("%d", &num2);
    printf("Result is: %d\n", num1 + num2);
    return 0;
}
